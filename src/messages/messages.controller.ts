import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Query,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { UpdateMessageDto } from './dto/update-message.dto';
import { ObjectIdDto } from '../common/dto/object-id.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { AuthGuard } from '../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  findAll(
    @Query(new ValidationPipe({ transform: true }))
    paginationDto: PaginationDto,
  ) {
    return this.messagesService.findAll(paginationDto);
  }

  @Get(':customer_id')
  findConversation(
    @Param() params: ObjectIdDto,
    @Query(new ValidationPipe({ transform: true }))
    paginationDto: PaginationDto,
  ) {
    return this.messagesService.findConversation(
      params.customer_id,
      paginationDto,
    );
  }

  @Patch(':customer_id')
  update(
    @Param() params: ObjectIdDto,
    @Body() updateMessageDto: UpdateMessageDto,
  ) {
    return this.messagesService.update(params.customer_id, updateMessageDto);
  }
}
