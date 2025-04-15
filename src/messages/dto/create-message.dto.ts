import { IsEnum } from 'class-validator';
import { ChatReference } from '../../common/enum';

export class CreateMessageDto {
  @IsEnum(ChatReference)
  view_by: ChatReference;
}
