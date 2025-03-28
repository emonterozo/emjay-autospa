import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { ServicesModule } from './services/services.module';
import { EmployeesModule } from './employees/employees.module';
import { ExpensesModule } from './expenses/expenses.module';
import { ConsumablesModule } from './consumables/consumables.module';
import { CustomersModule } from './customers/customers.module';
import { TransactionsModule } from './transactions/transactions.module';
import { AccountsModule } from './accounts/accounts.module';
import { PromosModule } from './promos/promos.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    ServicesModule,
    EmployeesModule,
    ExpensesModule,
    ConsumablesModule,
    CustomersModule,
    TransactionsModule,
    AccountsModule,
    PromosModule,
  ],
})
export class AppModule {}
