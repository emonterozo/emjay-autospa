import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PromosService } from './promos.service';
import { PromosController } from './promos.controller';
import { Promo, PromoSchema } from './schemas/promo.schema';
import { FirebaseModule } from '../firebase/firebase.module';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';

@Module({
  imports: [
    FirebaseModule,
    MongooseModule.forFeature([
      { name: Promo.name, schema: PromoSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
  ],
  controllers: [PromosController],
  providers: [PromosService],
  exports: [PromosService],
})
export class PromosModule {}
