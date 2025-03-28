import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { PaginationDto } from '../common/dto/pagination.dto';
import { Service } from './schemas/service.schema';
import { SuccessResponse } from '../common/dto/success-response.dto';
import { throwInternalServerError } from '../common/utils/error-utils';

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel(Service.name) private readonly serviceModel: Model<Service>,
  ) {}
  async findAll(paginationDto: PaginationDto) {
    try {
      const { order_by, limit, offset } = paginationDto;

      const query = this.serviceModel.find().select('-__v');

      if (limit && limit > 0) query.limit(limit);
      if (offset && offset > 0) query.skip(offset);

      if (order_by) {
        query.sort({ [order_by.field]: order_by?.direction });
      }

      const services = await query;
      const totalCount = await this.serviceModel.countDocuments();

      return new SuccessResponse({ services, totalCount });
    } catch {
      throwInternalServerError();
    }
  }
}
