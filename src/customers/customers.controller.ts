import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ValidationPipe,
  UsePipes,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ObjectIdDto } from '../common/dto/object-id.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { OtpDto } from './dto/otp.dto';
import { AuthGuard } from '../common/guards/auth.guard';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get(':customer_id/free-wash-points')
  @UseGuards(AuthGuard)
  getFreeWashPoints(@Param() params: ObjectIdDto) {
    return this.customersService.getFreeWashPoints(params.customer_id);
  }

  @Get(':customer_id/wash-points-promos')
  @UseGuards(AuthGuard)
  getWashPointsPromos(@Param() params: ObjectIdDto) {
    return this.customersService.getWashPointsPromos(params.customer_id);
  }

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(createCustomerDto);
  }

  @Post('/login')
  @UsePipes(new ValidationPipe({ transform: true }))
  async login(
    @Body() loginDto: Pick<CreateCustomerDto, 'contact_number' | 'password'>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.customersService.login(loginDto);
    res.status(result?.statusCode ?? 200).json(result);
  }

  @Post('/otp/send')
  @UsePipes(new ValidationPipe({ transform: true }))
  sendOtp(@Body() otpDto: OtpDto) {
    return this.customersService.sendOtp(otpDto);
  }

  @Post('/otp/verify')
  @UsePipes(new ValidationPipe({ transform: true }))
  verifyOtp(@Body() otpDto: OtpDto) {
    return this.customersService.verifyOtp(otpDto);
  }

  @Post('/forgot/password')
  @UsePipes(new ValidationPipe({ transform: true }))
  forgotPassword(@Body() otpDto: Pick<CreateCustomerDto, 'contact_number'>) {
    return this.customersService.forgotPassword(otpDto.contact_number);
  }

  @Post('/forgot/password/verify')
  @UsePipes(new ValidationPipe({ transform: true }))
  forgotPasswordVerifyOtp(@Body() otpDto: OtpDto) {
    return this.customersService.forgotPasswordVerifyOtp(otpDto);
  }

  @Get()
  @UseGuards(AuthGuard)
  findAll(
    @Query(new ValidationPipe({ transform: true }))
    paginationDto: PaginationDto,
  ) {
    return this.customersService.findAll(paginationDto);
  }

  @Get(':customer_id')
  @UseGuards(AuthGuard)
  findOne(@Param() params: ObjectIdDto) {
    return this.customersService.findOne(params.customer_id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customersService.update(+id, updateCustomerDto);
  }
}
