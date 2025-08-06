import {
  BadRequestException,
  GoneException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import axios from 'axios';
import { addDays, format, isAfter, subDays } from 'date-fns';

import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ObjectIdDto } from '../common/dto/object-id.dto';
import { Customer } from './schemas/customer.schema';
import { ErrorResponse } from '../common/dto/error-response.dto';
import { MessageType, VehicleType } from '../common/enum';
import { SuccessResponse } from '../common/dto/success-response.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import {
  throwInternalServerError,
  throwNotFoundException,
} from '../common/utils/error-utils';
import { TransactionsService } from '../transactions/transactions.service';
import { sendSMS } from '../common/utils/sendSMS';
import { Otp } from './schemas/otp.schema';
import { jwtSign } from '../common/utils/jwtSign';
import { OtpDto } from './dto/otp.dto';
import { PromosService } from '../promos/promos.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LoggerService } from '../logger/logger.service';
import { FirebaseService } from '../firebase/firebase.service';
import { Conversation } from '../messages/schemas/conversation.schema';
import { Message } from '../messages/schemas/message.schema';

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000);
}

const sizes = [
  {
    size: 'sm',
    count: 0,
  },
  {
    size: 'md',
    count: 0,
  },
  {
    size: 'lg',
    count: 0,
  },
  {
    size: 'xl',
    count: 0,
  },
];

export type DecodedToken = {
  user: {
    _id: string;
    username: string;
    first_name: string;
    last_name: string;
    gender: string;
  };
  iat: number;
  exp: number;
};

type DistanceMatrixResponse = {
  destination_addresses: string[];
  origin_addresses: string[];
  rows: {
    elements: {
      distance: {
        text: string;
        value: number;
      };
      duration: {
        text: string;
        value: number;
      };
      status: string;
    }[];
  }[];
  status: string;
};

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private readonly customerModel: Model<Customer>,
    @InjectModel(Otp.name) private readonly otpModel: Model<Otp>,
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<Conversation>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<Message>,
    private readonly firebaseService: FirebaseService,
    private readonly transactionService: TransactionsService,
    private readonly configService: ConfigService,
    private readonly promoService: PromosService,
    private readonly loggerService: LoggerService,
  ) {
    this.loggerService.setContext(CustomersService.name);
  }

  async getFreeWashPoints(id: ObjectIdDto['customer_id']) {
    const customer = await this.customerModel.findById(id);

    if (!customer)
      throw new NotFoundException(
        new ErrorResponse(404, [
          { field: 'customer_id', message: 'Customer does not exist' },
        ]),
      );

    const free_wash: {
      size: string;
      count: number;
      vehicle_type: string;
    }[] = [];

    customer.car_wash_service_count.forEach((item) => {
      if (item.count >= 9) {
        free_wash.push({
          size: item.size,
          count: item.count,
          vehicle_type: VehicleType.CAR,
        });
      }
    });

    customer.moto_wash_service_count.forEach((item) => {
      if (item.count >= 9) {
        free_wash.push({
          size: item.size,
          count: item.count,
          vehicle_type: VehicleType.MOTORCYCLE,
        });
      }
    });

    return new SuccessResponse({
      customer: {
        _id: customer._id,
        first_name: customer.first_name,
        last_name: customer.last_name,
        contact_number: customer.contact_number,
        points: customer.points,
        free_wash,
      },
    });
  }

  async getWashPointsPromos(id: ObjectIdDto['customer_id']) {
    const customer = await this.customerModel.findById(id);
    const result = await this.promoService.findAll(true);

    if (!customer)
      throw new NotFoundException(
        new ErrorResponse(404, [
          { field: 'customer_id', message: 'Customer does not exist' },
        ]),
      );

    return new SuccessResponse({
      customer: {
        _id: customer._id,
        points: customer.points,
        moto_wash_service_count: customer.moto_wash_service_count,
        car_wash_service_count: customer.car_wash_service_count,
      },
      promos: result?.data.promos ?? [],
    });
  }

  async create(createCustomerDto: CreateCustomerDto) {
    const { contact_number, password, birth_date } = createCustomerDto;
    const isExist = await this.customerModel.exists({ contact_number });

    if (isExist)
      throw new BadRequestException(
        new ErrorResponse(400, [
          { field: 'contact_number', message: 'Contact number already exists' },
        ]),
      );

    const saltRounds =
      parseInt(this.configService.get<string>('SALT_ROUND')!, 10) || 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const otp = generateOtp();

    const response = await sendSMS(
      contact_number,
      MessageType.VERIFICATION,
      otp,
      this.configService,
      this.loggerService,
    );

    if (response.success) {
      try {
        const savedCustomer = await this.customerModel.create({
          ...createCustomerDto,
          birth_date: new Date(birth_date),
          password: hashedPassword,
          province: null,
          city: null,
          barangay: null,
          address: null,
          registered_on: new Date(),
          is_verified: false,
          points: 0,
          car_wash_service_count: sizes,
          moto_wash_service_count: sizes.slice(0, -1),
        });

        await this.otpModel.create({ customer_id: savedCustomer._id, otp });

        return new SuccessResponse({
          user: {
            _id: savedCustomer._id,
            username: savedCustomer.contact_number,
          },
        });
      } catch {
        throwInternalServerError();
      }
    } else {
      throwInternalServerError();
    }
  }

  refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      const refreshTokenSecret: string = this.configService.get<string>(
        'REFRESH_TOKEN_SECRET',
      )!;

      const decoded = jwt.verify(
        refreshTokenDto.refresh_token,
        refreshTokenSecret,
      ) as DecodedToken;

      const { accessToken, refreshToken } = jwtSign(
        decoded.user,
        this.configService,
      );

      return new SuccessResponse({ accessToken, refreshToken });
    } catch {
      throw new UnauthorizedException(
        new ErrorResponse(403, [
          {
            field: 'refresh_token',
            message: 'Invalid or expired refresh token',
          },
        ]),
      );
    }
  }

  async login(
    loginDto: Pick<
      CreateCustomerDto,
      'contact_number' | 'password' | 'fcm_token'
    >,
  ) {
    const { contact_number, password } = loginDto;
    const customer = await this.customerModel.findOne({ contact_number });

    this.loggerService.log(`Customer try to login`, {
      contact_number: loginDto.contact_number,
    });

    if (!customer || !(await bcrypt.compare(password, customer.password))) {
      this.loggerService.error(`Customer failed to login`, {
        contact_number: loginDto.contact_number,
      });

      throw new UnauthorizedException(
        new ErrorResponse(401, [
          {
            field: 'username or password',
            message: 'Invalid username or password',
          },
        ]),
      );
    }

    await this.customerModel.findByIdAndUpdate(customer._id, {
      $set: { fcm_token: loginDto.fcm_token },
    });

    if (customer.is_verified) {
      const userData = {
        _id: customer._id.toString(),
        username: customer.contact_number,
        first_name: customer.first_name,
        last_name: customer.last_name,
        gender: customer.gender,
        birth_date: customer.birth_date,
        address: customer.address,
        barangay: customer.barangay,
        city: customer.city,
        province: customer.province,
        distance: customer.distance,
      };

      const { accessToken, refreshToken } = jwtSign(
        userData,
        this.configService,
      );

      return new SuccessResponse(
        {
          user: userData,
          accessToken,
          refreshToken,
        },
        200,
      );
    }

    const otp = generateOtp();
    const response = await sendSMS(
      contact_number,
      MessageType.VERIFICATION,
      otp,
      this.configService,
      this.loggerService,
    );

    if (response.success) {
      await this.otpModel.create({
        customer_id: customer._id,
        otp,
      });

      return new SuccessResponse(
        {
          user: { _id: customer._id, username: contact_number },
        },
        201,
      );
    } else {
      throwInternalServerError();
    }
  }

  async sendOtp(otpDto: OtpDto) {
    const { customer_id, message_type } = otpDto;
    const customer = await this.customerModel.findById(customer_id);

    if (!customer)
      return throwNotFoundException('customer_id', 'Customer does not exist');

    const otp = generateOtp();

    const response = await sendSMS(
      customer.contact_number,
      message_type!,
      otp,
      this.configService,
      this.loggerService,
    );

    if (response.success) {
      await this.otpModel.create({
        customer_id: customer._id,
        otp,
      });

      return new SuccessResponse({
        user: { _id: customer._id, username: customer.contact_number },
      });
    } else {
      throwInternalServerError();
    }
  }

  async verifyOtp(otpDto: OtpDto) {
    const { customer_id, otp } = otpDto;
    const customer = await this.customerModel.findById(customer_id);

    if (!customer)
      return throwNotFoundException('customer_id', 'Customer does not exist');

    const otpData = await this.otpModel
      .findOne({
        customer_id: new Types.ObjectId(customer_id),
      })
      .sort({ created_at: -1 });

    if (!otpData)
      throw new GoneException(
        new ErrorResponse(410, [{ field: 'otp', message: 'Expired OTP' }]),
      );

    if (otp !== otpData.otp)
      throw new UnauthorizedException(
        new ErrorResponse(401, [{ field: 'otp', message: 'Incorrect OTP' }]),
      );

    await this.otpModel.deleteMany({ customer_id: otpData.customer_id });
    const updatedCustomer = await this.customerModel.findByIdAndUpdate(
      customer_id,
      { is_verified: true },
    );

    const userData = {
      _id: updatedCustomer?._id.toString() ?? '',
      username: updatedCustomer?.contact_number ?? '',
      first_name: updatedCustomer?.first_name ?? '',
      last_name: updatedCustomer?.last_name ?? '',
      gender: updatedCustomer?.gender ?? '',
      birth_date: updatedCustomer?.birth_date,
      fcm_token: updatedCustomer?.fcm_token ?? '',
    };

    const body =
      "Thank you for joining us! You've taken the first step toward a spotless ride. We’re excited to serve you!";

    await this.messageModel.create({
      customer_id: new Types.ObjectId(customer?.id),
      message: body,
      timestamp: new Date(),
      from: 'emjay',
      is_read: false,
    });

    await this.conversationModel.findOneAndUpdate(
      { customer_id: new Types.ObjectId(customer?.id) },
      {
        $set: {
          last_message: {
            message: body,
            timestamp: new Date(),
            from: 'emjay',
          },
        },
        $inc: {
          customer_unread_count: 1,
        },
        $setOnInsert: {
          customer_id: new Types.ObjectId(customer?.id),
        },
      },
      {
        new: true,
        upsert: true,
      },
    );

    await this.firebaseService.sendPushNotification({
      type: 'single',
      title: 'Welcome to Emjay Rewards',
      body: body,
      deviceToken: customer?.fcm_token,
      data: {
        type: 'message',
        id: customer_id.toString(),
      },
    });

    const { accessToken, refreshToken } = jwtSign(userData, this.configService);

    return new SuccessResponse({ user: userData, accessToken, refreshToken });
  }

  async forgotPassword(contactNumber: CreateCustomerDto['contact_number']) {
    const customer = await this.customerModel.findOne({
      contact_number: contactNumber,
    });

    if (!customer)
      return throwNotFoundException('customer_id', 'Customer does not exist');

    const otp = generateOtp();

    const response = await sendSMS(
      customer.contact_number,
      MessageType.FORGOT,
      otp,
      this.configService,
      this.loggerService,
    );

    if (response.success) {
      await this.otpModel.create({
        customer_id: customer._id,
        otp,
      });

      return new SuccessResponse({
        user: { _id: customer._id, username: customer.contact_number },
      });
    } else {
      throwInternalServerError();
    }
  }

  async forgotPasswordVerifyOtp(otpDto: OtpDto) {
    const { customer_id, otp, password } = otpDto;
    const customer = await this.customerModel.findById(customer_id);

    if (!customer)
      return throwNotFoundException('customer_id', 'Customer does not exist');

    const otpData = await this.otpModel
      .findOne({
        customer_id: new Types.ObjectId(customer_id),
      })
      .sort({ created_at: -1 });

    if (!otpData)
      throw new GoneException(
        new ErrorResponse(410, [{ field: 'otp', message: 'Expired OTP' }]),
      );

    if (otp !== otpData.otp)
      throw new UnauthorizedException(
        new ErrorResponse(401, [{ field: 'otp', message: 'Incorrect OTP' }]),
      );

    const saltRounds =
      parseInt(this.configService.get<string>('SALT_ROUND')!, 10) || 10;
    const hashedPassword = await bcrypt.hash(password!, saltRounds);

    await this.otpModel.deleteMany({ customer_id: otpData.customer_id });
    const updatedCustomer = await this.customerModel.findByIdAndUpdate(
      customer_id,
      { is_verified: true, password: hashedPassword },
    );

    const userData = {
      _id: updatedCustomer?._id.toString() ?? '',
      username: updatedCustomer?.contact_number ?? '',
      first_name: updatedCustomer?.first_name ?? '',
      last_name: updatedCustomer?.last_name ?? '',
      gender: updatedCustomer?.gender ?? '',
      birth_date: updatedCustomer?.birth_date ?? '',
      fcm_token: updatedCustomer?.fcm_token ?? '',
    };

    const { accessToken, refreshToken } = jwtSign(userData, this.configService);

    return new SuccessResponse({ user: userData, accessToken, refreshToken });
  }

  async findAll(paginationDto: PaginationDto) {
    try {
      const { order_by, limit, offset } = paginationDto;

      const query = this.customerModel
        .find()
        .select('_id first_name last_name gender contact_number registered_on');

      if (limit && limit > 0) query.limit(limit);
      if (offset && offset > 0) query.skip(offset);

      if (order_by) {
        query.sort({ [order_by.field]: order_by?.direction });
      }

      const customers = await query;
      const totalCount = await this.customerModel.countDocuments();

      return new SuccessResponse({ customers, totalCount });
    } catch {
      throwInternalServerError();
    }
  }

  async findOne(id: ObjectIdDto['customer_id']) {
    const customer = await this.customerModel.findById(id).lean().exec();

    if (!customer)
      throwNotFoundException('customer_id', 'Customer does not exist');

    const result = await this.transactionService.getRecentTransactions(
      'customer',
      id!,
    );

    return new SuccessResponse({
      customer: { ...customer, transactions: result.transactions },
    });
  }

  async update(
    id: ObjectIdDto['customer_id'],
    updateCustomerDto: UpdateCustomerDto,
  ) {
    if (updateCustomerDto.password && updateCustomerDto.current_password) {
      const customer = await this.customerModel.findById(id);

      if (!customer)
        return throwNotFoundException('customer_id', 'Customer does not exist');

      if (
        !(await bcrypt.compare(
          updateCustomerDto.current_password,
          customer?.password,
        ))
      ) {
        throw new BadRequestException(
          new ErrorResponse(400, [
            {
              field: 'current_password',
              message: 'Current password is incorrect',
            },
          ]),
        );
      }

      const saltRounds =
        parseInt(this.configService.get<string>('SALT_ROUND')!, 10) || 10;
      const hashedPassword = await bcrypt.hash(
        updateCustomerDto.password,
        saltRounds,
      );

      const updateCustomer = await this.customerModel.findByIdAndUpdate(id, {
        password: hashedPassword,
      });

      if (!updateCustomer) return;

      return new SuccessResponse({
        user: {
          _id: id,
          first_name: updateCustomer.first_name,
          last_name: updateCustomer.last_name,
          address: updateCustomer.address,
          barangay: updateCustomer.barangay,
          city: updateCustomer.city,
          province: updateCustomer.province,
          distance: updateCustomer.distance,
        },
      });
    }

    let distanceValue = '';

    const customer = await this.customerModel.findById(id);

    const fiveDaysAgo = subDays(new Date(), 5);

    if (
      customer?.profile_updated_at &&
      isAfter(customer.profile_updated_at, fiveDaysAgo)
    ) {
      const fiveDays = addDays(customer.profile_updated_at, 5);
      throw new BadRequestException(
        new ErrorResponse(400, [
          {
            field: 'profile_updated_at',
            message: `Profile updates will be available again on ${format(fiveDays, 'MMM dd, yyyy')}.`,
          },
        ]),
      );
    }

    try {
      const apiKey = this.configService.get<string>(
        'GOOGLE_DISTANCE_MATRIX_API',
      )!;
      const latitude = this.configService.get<string>(
        'EMJAY_STARTING_LATITUDE',
      )!;
      const longitude = this.configService.get<string>(
        'EMJAY_STARTING_LONGITUDE',
      )!;

      const response = await axios.get<DistanceMatrixResponse>(
        'https://maps.googleapis.com/maps/api/distancematrix/json',
        {
          params: {
            origins: `${updateCustomerDto.latitude},${updateCustomerDto.longitude}`,
            destinations: `${latitude},${longitude}`,
            key: apiKey,
          },
        },
      );

      const data = response.data;

      if (data.rows.length && data.rows[0].elements.length) {
        const element = data.rows[0].elements[0];

        if (element.status === 'OK') {
          distanceValue = element.distance.text;
        } else {
          throwInternalServerError();
        }
      } else {
        throwInternalServerError();
      }
    } catch {
      throwInternalServerError();
    }

    const updateCustomer = await this.customerModel.findByIdAndUpdate(
      id,
      {
        first_name: updateCustomerDto.first_name,
        last_name: updateCustomerDto.last_name,
        address: updateCustomerDto.address ?? null,
        barangay: updateCustomerDto.barangay ?? null,
        city: updateCustomerDto.city ?? null,
        province: updateCustomerDto.province ?? null,
        latitude: updateCustomerDto.latitude,
        longitude: updateCustomerDto.longitude,
        distance: distanceValue,
        profile_updated_at: new Date(),
      },
      { returnDocument: 'after' },
    );

    if (!updateCustomer)
      return throwNotFoundException('customer_id', 'Customer does not exist');

    return new SuccessResponse({
      user: {
        _id: id,
        first_name: updateCustomer.first_name,
        last_name: updateCustomer.last_name,
        address: updateCustomer.address,
        barangay: updateCustomer.barangay,
        city: updateCustomer.city,
        province: updateCustomer.province,
        distance: updateCustomer.distance,
      },
    });
  }
}
