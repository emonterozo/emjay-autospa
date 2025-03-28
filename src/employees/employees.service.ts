import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { Employee } from './schemas/employee.schema';
import { SuccessResponse } from '../common/dto/success-response.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ObjectIdDto } from '../common/dto/object-id.dto';
import {
  throwInternalServerError,
  throwNotFoundException,
} from '../common/utils/error-utils';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectModel(Employee.name) private readonly employeeModel: Model<Employee>,
    private readonly transactionService: TransactionsService,
  ) {}
  async create(createEmployeeDto: CreateEmployeeDto) {
    try {
      const savedEmployee = await this.employeeModel.create(createEmployeeDto);

      return new SuccessResponse({ employee: { _id: savedEmployee._id } });
    } catch {
      throwInternalServerError();
    }
  }

  async findAll(paginationDto: PaginationDto) {
    try {
      const { order_by, limit, offset } = paginationDto;

      const query = this.employeeModel
        .find()
        .select(
          '_id first_name last_name gender employee_title employee_status',
        );

      if (limit && limit > 0) query.limit(limit);
      if (offset && offset > 0) query.skip(offset);

      if (order_by) {
        query.sort({ [order_by.field]: order_by?.direction });
      }

      const employees = await query;
      const totalCount = await this.employeeModel.countDocuments();

      return new SuccessResponse({ employees, totalCount });
    } catch (err) {
      console.log(err);
      throwInternalServerError();
    }
  }

  async findOne(id: ObjectIdDto['employee_id']) {
    const employee = await this.employeeModel.findById(id).lean().exec();

    if (!employee)
      throwNotFoundException('employee_id', 'Employee does not exist');

    const result = await this.transactionService.getRecentTransactions(
      'employee',
      id!,
    );

    return new SuccessResponse({
      employee: { ...employee, transactions: result.transactions },
    });
  }

  async update(
    id: ObjectIdDto['employee_id'],
    updateEmployeeDto: UpdateEmployeeDto,
  ) {
    const updatedEmployee = await this.employeeModel.findByIdAndUpdate(
      id,
      updateEmployeeDto,
    );

    if (updatedEmployee) {
      return new SuccessResponse({ employee: { _id: updatedEmployee._id } });
    }

    throwNotFoundException('employee_id', 'Employee does not exist');
  }
}
