import { Module } from '@nestjs/common';
import { ConsumablesService } from './consumables.service';
import { ConsumablesController } from './consumables.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Consumable, ConsumableSchema } from './schemas/consumable.schema';
import { Expense, ExpenseSchema } from '../expenses/schema/expense.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Consumable.name, schema: ConsumableSchema },
      { name: Expense.name, schema: ExpenseSchema },
    ]),
  ],
  controllers: [ConsumablesController],
  providers: [ConsumablesService],
})
export class ConsumablesModule {}
