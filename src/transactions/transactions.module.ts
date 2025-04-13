import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';
import { Service, ServiceSchema } from '../services/schemas/service.schema';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { Expense, ExpenseSchema } from '../expenses/schema/expense.schema';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
      { name: Service.name, schema: ServiceSchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Expense.name, schema: ExpenseSchema },
    ]),
    FirebaseModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
