import { IsMongoId, IsOptional } from 'class-validator';
import { Types } from 'mongoose';

export class ObjectIdDto {
  @IsOptional()
  @IsMongoId()
  employee_id?: Types.ObjectId;

  @IsOptional()
  @IsMongoId()
  customer_id?: Types.ObjectId;

  @IsOptional()
  @IsMongoId()
  consumable_id?: Types.ObjectId;

  @IsOptional()
  @IsMongoId()
  transaction_id?: Types.ObjectId;

  @IsOptional()
  @IsMongoId()
  availed_service_id?: Types.ObjectId;

  @IsOptional()
  @IsMongoId()
  promo_id?: Types.ObjectId;
}
