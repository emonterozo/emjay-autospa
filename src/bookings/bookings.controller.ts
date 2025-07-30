import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, DateStringDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { UpdateBookingSlotDto } from './dto/update-booking-slot.dto';
import { AuthGuard } from '../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  create(@Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.create(createBookingDto);
  }

  @Patch()
  @UsePipes(new ValidationPipe({ transform: true }))
  update(@Body() updateBookingDto: UpdateBookingDto) {
    return this.bookingsService.update(updateBookingDto);
  }

  @Get()
  getBookings() {
    return this.bookingsService.getBookings();
  }

  @Get('user')
  getUserBooking(@Request() req: any) {
    return this.bookingsService.getUserBooking(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      req.user.user._id as string,
    );
  }

  @Get(':date')
  findDate(@Param() params: DateStringDto) {
    return this.bookingsService.findDate(params.date);
  }

  @Patch(':date')
  @UsePipes(new ValidationPipe({ transform: true }))
  updateSlot(
    @Param() params: DateStringDto,
    @Body() updateBookingSlotDto: UpdateBookingSlotDto,
    @Request() req: any,
  ) {
    return this.bookingsService.updateSlot(
      params.date,
      updateBookingSlotDto,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      req.user.user._id as string,
    );
  }
}
