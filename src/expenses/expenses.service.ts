import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateExpenseDto } from './dto/create-expense.dto';
import { Expense } from './schema/expense.schema';
import { throwInternalServerError } from '../common/utils/error-utils';
import { SuccessResponse } from '../common/dto/success-response.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectModel(Expense.name) private readonly expenseModel: Model<Expense>,
  ) {}
  async create(createExpenseDto: CreateExpenseDto) {
    try {
      const savedExpense = await this.expenseModel.create(createExpenseDto);

      return new SuccessResponse({ expense: { _id: savedExpense._id } });
    } catch {
      throwInternalServerError();
    }
  }

  async findAll(paginationDto: PaginationDto) {
    try {
      const { limit, offset, order_by, date_range } = paginationDto;

      const query = this.expenseModel.find().select('-__v');

      if (date_range) {
        const { start, end } = date_range;
        query.where('date').gte(start as unknown as number);
        query.where('date').lte(end as unknown as number);
      }

      if (limit && limit > 0) query.limit(limit);
      if (offset && offset > 0) query.skip(offset);

      if (order_by) {
        query.sort({ [order_by.field]: order_by?.direction });
      }

      const expenses = await query;
      const totalCountQuery = this.expenseModel.find();
      if (date_range) {
        const { start, end } = date_range;
        totalCountQuery.where('date').gte(start as unknown as number);
        totalCountQuery.where('date').lte(end as unknown as number);
      }

      const totalCount = await totalCountQuery.countDocuments();

      return new SuccessResponse({ expenses, totalCount });
    } catch {
      throwInternalServerError();
    }
  }
}
