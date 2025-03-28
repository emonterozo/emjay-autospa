import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';

import { ServicesService } from './services.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  findAll(
    @Query(new ValidationPipe({ transform: true }))
    paginationDto: PaginationDto,
  ) {
    return this.servicesService.findAll(paginationDto);
  }
}
