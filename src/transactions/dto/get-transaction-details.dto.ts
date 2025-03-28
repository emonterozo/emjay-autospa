import { IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

export class GetTransactionDetailsDto {
  @IsMongoId()
  transaction_id: Types.ObjectId;

  @IsMongoId()
  availed_service_id: Types.ObjectId;
}
