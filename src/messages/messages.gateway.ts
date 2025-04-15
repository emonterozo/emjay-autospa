import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { EventsMap } from 'socket.io/dist/typed-events';

import { PrivateMessageDto } from './dto/private-message.dto';
import { Conversation } from '../messages/schemas/conversation.schema';
import { Message } from '../messages/schemas/message.schema';
import { ChatReference } from '../common/enum';
import { formatTimestamp } from '../common/utils/date-utils';
import { FirebaseService } from '../firebase/firebase.service';
import { Customer } from '../customers/schemas/customer.schema';

@WebSocketGateway({
  cors: {
    origin: '*', // For development; restrict in production
  },
})
export class MessagesGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly logger: Logger = new Logger('MessagesGateway');

  constructor(
    @InjectModel(Customer.name)
    private readonly customerModel: Model<Customer>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<Conversation>,
    @InjectModel(Message.name) private readonly messageModel: Model<Message>,
    private readonly firebaseService: FirebaseService,
  ) {}

  afterInit() {
    this.logger.log('Initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // User joins a room based on their user ID
  @SubscribeMessage('join')
  async handleJoin(
    @MessageBody() payload: { customerId: string; role: ChatReference },
    @ConnectedSocket()
    client: Socket<
      EventsMap,
      EventsMap,
      EventsMap,
      { customerId: string; role: ChatReference }
    >,
  ) {
    const { customerId, role } = payload;

    client.data.customerId = customerId;
    client.data.role = role;

    await client.join(`room-${customerId}`);
    this.logger.log(`Socket ${client.id} joined room-${customerId}`);
  }

  // Handle private message
  @SubscribeMessage('privateMessage')
  async handlePrivateMessage(
    @MessageBody()
    payload: PrivateMessageDto,
  ) {
    const { from, to, message } = payload;

    const timestamp = new Date();
    const customerId = from.ref === ChatReference.EMJAY ? to?.id : from.id;

    const savedMessage = await this.messageModel.create({
      customer_id: new Types.ObjectId(customerId),
      message,
      timestamp,
      from: from.ref,
      is_read: false,
    });

    this.server
      .to(`room-${payload.to ? payload.to.id : payload.from.id}`)
      .emit('privateMessage', {
        message: {
          ...savedMessage.toObject(),
          timestamp: formatTimestamp(timestamp),
        },
      });

    if (from.ref === ChatReference.EMJAY) {
      const customer = await this.customerModel.findById(customerId);
      if (!customer) return;

      const sockets = await this.server.in(`room-${customerId}`).fetchSockets();
      const customerSockets = sockets.filter(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (socket) => socket.data.role === ChatReference.CUSTOMER,
      );

      if (customerSockets.length <= 0) {
        await this.firebaseService.sendPushNotification({
          type: 'single',
          title: 'New message from Emjay Admin',
          body: 'You’ve received a new message. Tap to reply!',
          data: { type: 'message', id: customerId! },
          deviceToken: customer.fcm_token,
        });
      }
    }

    await this.conversationModel.findOneAndUpdate(
      { customer_id: new Types.ObjectId(customerId) },
      {
        $set: {
          last_message: {
            message,
            timestamp,
            from: from.ref,
          },
        },
        $inc: {
          emjay_unread_count: from.ref === ChatReference.CUSTOMER ? 1 : 0,
          customer_unread_count: from.ref === ChatReference.EMJAY ? 1 : 0,
        },
        $setOnInsert: {
          customer_id: new Types.ObjectId(customerId),
        },
      },
      {
        new: true,
        upsert: true,
      },
    );
  }

  @SubscribeMessage('leave')
  async handleLeave(
    @MessageBody() customerId: string,
    @ConnectedSocket() client: Socket,
  ) {
    await client.leave(`room-${customerId}`);
    this.logger.log(`Socket ${client.id} left room-${customerId}`);
  }
}
