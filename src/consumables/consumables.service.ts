import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateConsumableDto } from './dto/create-consumable.dto';
import { Consumable } from './schemas/consumable.schema';
import { Expense } from '../expenses/schema/expense.schema';
import { throwInternalServerError } from '../common/utils/error-utils';
import { SuccessResponse } from '../common/dto/success-response.dto';
import { ExpenseCategory } from '../common/enum';
import { ObjectIdDto } from '../common/dto/object-id.dto';
import { ErrorResponse } from '../common/dto/error-response.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class ConsumablesService {
  constructor(
    @InjectModel(Consumable.name)
    private readonly consumableModel: Model<Consumable>,
    @InjectModel(Expense.name)
    private readonly expenseModel: Model<Expense>,
  ) {}
  async create(createConsumableDto: CreateConsumableDto) {
    try {
      const savedConsumable =
        await this.consumableModel.create(createConsumableDto);

      if (savedConsumable) {
        await this.expenseModel.create({
          category: ExpenseCategory.CONSUMABLES,
          description: `Purchased ${createConsumableDto.name}`,
          amount: createConsumableDto.price * createConsumableDto.quantity,
          date: createConsumableDto.date,
        });
      }

      return new SuccessResponse({ consumable: { _id: savedConsumable._id } });
    } catch {
      throwInternalServerError();
    }
  }

  async findAll(paginationDto: PaginationDto) {
    try {
      const { order_by, limit, offset } = paginationDto;

      const query = this.consumableModel.find().select('-__v');

      if (limit && limit > 0) query.limit(limit);
      if (offset && offset > 0) query.skip(offset);

      if (order_by) {
        query.sort({ [order_by.field]: order_by?.direction });
      }

      const consumables = await query;
      const totalCount = await this.consumableModel.countDocuments();

      return new SuccessResponse({ consumables, totalCount });
    } catch {
      throwInternalServerError();
    }
  }

  async remove(id: ObjectIdDto['consumable_id']) {
    const consumable = await this.consumableModel.findByIdAndDelete(id);

    if (consumable) {
      return new SuccessResponse({ consumable: { _id: consumable._id } });
    }

    throw new NotFoundException(
      new ErrorResponse(404, [
        { field: 'consumable_id', message: 'Consumable does not exist' },
      ]),
    );
  }
}
