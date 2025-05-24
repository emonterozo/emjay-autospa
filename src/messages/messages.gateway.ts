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
import { Account } from '../accounts/schemas/account.schema';

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
    @InjectModel(Account.name)
    private readonly accountModel: Model<Account>,
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

    const sockets = await this.server.in(`room-${customerId}`).fetchSockets();
    let token = '';

    if (from.ref === ChatReference.EMJAY) {
      const customer = await this.customerModel.findById(customerId);
      if (!customer) return;
      token = customer.fcm_token;
    }

    const filteredSocket = sockets.find((socket) => {
      const data = socket.data as { role: ChatReference };
      return (
        data.role ===
        (from.ref === ChatReference.EMJAY
          ? ChatReference.CUSTOMER
          : ChatReference.EMJAY)
      );
    });

    if (!filteredSocket) {
      let tokens: string[] = [];
      if (from.ref === ChatReference.CUSTOMER) {
        const accounts = await this.accountModel
          .find()
          .select('fcm_token')
          .lean();

        tokens = accounts.map((item) => item.fcm_token);
      }

      const data = {
        title: `New message from Emjay ${from.ref === ChatReference.EMJAY ? 'Admin' : 'Customer'}`,
        body: 'You’ve received a new message. Tap to reply!',
        data: { type: 'message', id: customerId! },
      };

      if (from.ref === ChatReference.EMJAY) {
        await this.firebaseService.sendPushNotification({
          ...data,
          type: 'single',
          deviceToken: token,
        });
      } else {
        await this.firebaseService.sendPushNotification({
          ...data,
          type: 'multiple',
          deviceTokens: tokens,
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
