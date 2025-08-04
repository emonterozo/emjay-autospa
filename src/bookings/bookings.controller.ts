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
  Query,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, DateStringDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { UpdateBookingSlotDto } from './dto/update-booking-slot.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import { UpdateScheduledBookingDto } from './dto/update-scheduled-booking.dto';

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
  getBookings(@Request() req: any) {
    return this.bookingsService.getBookings(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      req.user.user._id as string,
    );
  }

  @Get('/scheduled')
  getScheduledServices(
    @Query(new ValidationPipe({ transform: true }))
    paginationDto: PaginationDto,
  ) {
    return this.bookingsService.getScheduledServices(paginationDto);
  }

  @Patch('/scheduled')
  @UsePipes(new ValidationPipe({ transform: true }))
  updateScheduledBooking(
    @Body() updateScheduledBookingDto: UpdateScheduledBookingDto,
  ) {
    return this.bookingsService.updateScheduledBooking(
      updateScheduledBookingDto,
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
