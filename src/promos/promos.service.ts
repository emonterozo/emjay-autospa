import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreatePromoDto } from './dto/create-promo.dto';
import { UpdatePromoDto } from './dto/update-promo.dto';
import { Promo } from './schemas/promo.schema';
import {
  throwInternalServerError,
  throwNotFoundException,
} from '../common/utils/error-utils';
import { SuccessResponse } from '../common/dto/success-response.dto';
import { FirebaseService } from '../firebase/firebase.service';
import { Customer } from '../customers/schemas/customer.schema';
import { ObjectIdDto } from '../common/dto/object-id.dto';

@Injectable()
export class PromosService {
  constructor(
    @InjectModel(Promo.name) private readonly promoModel: Model<Promo>,
    @InjectModel(Customer.name) private readonly customerModel: Model<Customer>,
    private readonly firebaseService: FirebaseService,
  ) {}
  async create(createPromoDto: CreatePromoDto) {
    try {
      const savedPromo = await this.promoModel.create({
        ...createPromoDto,
        is_free: createPromoDto.percent === 100,
      });

      if (createPromoDto.is_active) {
        const customers = await this.customerModel
          .find({ fcm_token: { $ne: null } })
          .select('fcm_token')
          .exec();

        const fcmTokens = customers.map((customer) => customer.fcm_token);

        await this.firebaseService.sendPushNotification({
          type: 'multiple',
          title: `${createPromoDto.percent}% ${createPromoDto.title}`,
          body: createPromoDto.description,
          deviceTokens: fcmTokens,
          data: {
            type: 'promo',
            id: savedPromo._id.toString(),
          },
        });
      }

      return new SuccessResponse({ promo: { _id: savedPromo._id } });
    } catch {
      throwInternalServerError();
    }
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

  async update(id: ObjectIdDto['promo_id'], updatePromoDto: UpdatePromoDto) {
    const updatedPromo = await this.promoModel.findByIdAndUpdate(
      id,
      updatePromoDto,
      { new: true },
    );

    if (updatedPromo) {
      if (updatePromoDto.is_active) {
        const customers = await this.customerModel
          .find({ fcm_token: { $ne: null } })
          .select('fcm_token')
          .exec();

        const fcmTokens = customers.map((customer) => customer.fcm_token);

        await this.firebaseService.sendPushNotification({
          type: 'multiple',
          title: `${updatedPromo.percent}% ${updatedPromo.title}`,
          body: updatedPromo.description,
          deviceTokens: fcmTokens,
          data: {
            type: 'promo',
            id: updatedPromo._id.toString(),
          },
        });
      }

      return new SuccessResponse({ promo: { _id: updatedPromo._id } });
    }

    throwNotFoundException('promo_id', 'Employee does not exist');
  }

  remove(id: number) {
    return `This action removes a #${id} promo`;
  }
}
