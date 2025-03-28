import { IsEnum, IsMongoId, IsNumber } from 'class-validator';
import { Types } from 'mongoose';
import { ServiceCharge } from '../../common/enum';

export class CreateAvailedServiceDto {
  @IsMongoId()
  service_id: Types.ObjectId;

  @IsNumber()
  price: number;

  @IsEnum(ServiceCharge)
  service_charge: ServiceCharge;
}
