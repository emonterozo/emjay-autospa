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
  {
    size: 'xxl',
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

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private readonly customerModel: Model<Customer>,
    @InjectModel(Otp.name) private readonly otpModel: Model<Otp>,
    private readonly transactionService: TransactionsService,
    private readonly configService: ConfigService,
    private readonly promoService: PromosService,
  ) {}
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
      if (item.count >= 10) {
        free_wash.push({
          size: item.size,
          count: item.count,
          vehicle_type: VehicleType.CAR,
        });
      }
    });

    customer.moto_wash_service_count.forEach((item) => {
      if (item.count >= 10) {
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
    loginDto: Pick<CreateCustomerDto, 'contact_number' | 'password'>,
  ) {
    const { contact_number, password } = loginDto;
    const customer = await this.customerModel.findOne({ contact_number });

    if (!customer || !(await bcrypt.compare(password, customer.password)))
      throw new UnauthorizedException(
        new ErrorResponse(401, [
          {
            field: 'username or password',
            message: 'Invalid username or password',
          },
        ]),
      );

    if (customer.is_verified) {
      const userData = {
        _id: customer._id.toString(),
        username: customer.contact_number,
        first_name: customer.first_name,
        last_name: customer.last_name,
        gender: customer.gender,
        birth_date: customer.birth_date,
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
    };

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

      return new SuccessResponse({
        user: {
          _id: id,
          first_name: updateCustomer?.first_name,
          last_name: updateCustomer?.last_name,
        },
      });
    }

    const updateCustomer = await this.customerModel.findByIdAndUpdate(
      id,
      {
        first_name: updateCustomerDto.first_name,
        last_name: updateCustomerDto.last_name,
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
      },
    });
  }
}
