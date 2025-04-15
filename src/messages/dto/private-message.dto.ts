import {
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ChatReference } from '../../common/enum';

class UserRefDto {
  @IsMongoId()
  @IsString()
  id: string;

  @IsEnum({ enum: ChatReference })
  ref: ChatReference;
}

export class PrivateMessageDto {
  @ValidateNested()
  @Type(() => UserRefDto)
  from: UserRefDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => UserRefDto)
  to?: UserRefDto;

  @IsString()
  message: string;
}
