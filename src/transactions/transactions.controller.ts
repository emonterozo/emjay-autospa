import {
  Controller,
  Post,
  Body,
  Patch,
  Param,
  UsePipes,
  ValidationPipe,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { CreateAvailedServiceDto } from './dto/create-availed-service.dto';
import { UpdateAvailedServiceDto } from './dto/update-availed-service.dto';
import { ObjectIdDto } from '../common/dto/object-id.dto';
import { GetTransactionDto } from './dto/get-transaction.dto';
import { GetCompletedTransactionDto } from './dto/get-completed-transaction.dto';
import { GetTransactionDetailsDto } from './dto/get-transaction-details.dto';
import { GetWeekSalesDto } from './dto/get-week-sales.dto';
import { GetTransactionStatisticsDto } from './dto/get-transaction-statistics.dto';
import { AuthGuard } from '../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  getTransactions(@Query() getTransactionDto: GetTransactionDto) {
    return this.transactionsService.getTransactions(getTransactionDto);
  }

  @Get('/week-sales')
  getWeekSales(@Query() getWeekSalesDto: GetWeekSalesDto) {
    return this.transactionsService.getWeekSales(getWeekSalesDto);
  }

  @Get('/statistics')
  getTransactionStatistics(
    @Query() getTransactionStatisticsDto: GetTransactionStatisticsDto,
  ) {
    return this.transactionsService.getTransactionStatistics(
      getTransactionStatisticsDto,
    );
  }

  @Get('/completed')
  getCompletedTransactions(
    @Query() getCompletedTransactionDto: GetCompletedTransactionDto,
  ) {
    return this.transactionsService.getCompletedTransactions(
      getCompletedTransactionDto,
    );
  }

  @Get('/details')
  getTransactionDetails(
    @Query() getTransactionDetailsDto: GetTransactionDetailsDto,
  ) {
    return this.transactionsService.getTransactionDetails(
      getTransactionDetailsDto,
    );
  }

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  create(@Body(ValidationPipe) createTransactionDto: CreateTransactionDto) {
    return this.transactionsService.create(createTransactionDto);
  }

  @Get(':transaction_id')
  getTransaction(@Param() params: ObjectIdDto) {
    return this.transactionsService.getTransaction(params.transaction_id);
  }

  @Patch(':transaction_id')
  @UsePipes(new ValidationPipe({ transform: true }))
  update(
    @Param() params: ObjectIdDto,
    @Body(ValidationPipe) updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(
      params.transaction_id,
      updateTransactionDto,
    );
  }

  @Patch(':transaction_id/availed_services')
  @UsePipes(new ValidationPipe({ transform: true }))
  createAvailedService(
    @Param() params: ObjectIdDto,
    @Body(ValidationPipe) createAvailedServiceDto: CreateAvailedServiceDto,
  ) {
    return this.transactionsService.createAvailedService(
      params.transaction_id,
      createAvailedServiceDto,
    );
  }

  @Get(':transaction_id/availed_services/:availed_service_id')
  getTransactionAvailedService(@Param() params: ObjectIdDto) {
    return this.transactionsService.getTransactionAvailedService(
      params.transaction_id,
      params.availed_service_id,
    );
  }

  @Patch(':transaction_id/availed_services/:availed_service_id')
  @UsePipes(new ValidationPipe({ transform: true }))
  updateAvailedService(
    @Param() params: ObjectIdDto,
    @Body(ValidationPipe) updateAvailedServiceDto: UpdateAvailedServiceDto,
  ) {
    return this.transactionsService.updateAvailedService(
      params.transaction_id,
      params.availed_service_id,
      updateAvailedServiceDto,
    );
  }
}
