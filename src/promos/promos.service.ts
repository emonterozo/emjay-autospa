import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreatePromoDto } from './dto/create-promo.dto';
import { UpdatePromoDto } from './dto/update-promo.dto';
import { Promo } from './schemas/promo.schema';
import { throwInternalServerError } from '../common/utils/error-utils';
import { SuccessResponse } from '../common/dto/success-response.dto';

@Injectable()
export class PromosService {
  constructor(
    @InjectModel(Promo.name) private readonly promoModel: Model<Promo>,
  ) {}
  create(createPromoDto: CreatePromoDto) {
    return 'This action adds a new promo';
  }

  async findAll(isActive?: boolean) {
    try {
      const query = this.promoModel.find();

      if (isActive) {
        query.where('is_active').equals(isActive);
      }

      const promos = await query.exec();

      return new SuccessResponse({ promos });
    } catch {
      throwInternalServerError();
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} promo`;
  }

  update(id: number, updatePromoDto: UpdatePromoDto) {
    return `This action updates a #${id} promo`;
  }

  remove(id: number) {
    return `This action removes a #${id} promo`;
  }
}
