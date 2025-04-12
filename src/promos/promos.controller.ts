import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { PromosService } from './promos.service';
import { CreatePromoDto } from './dto/create-promo.dto';
import { UpdatePromoDto } from './dto/update-promo.dto';
import { AuthGuard } from '../common/guards/auth.guard';

//@UseGuards(AuthGuard)
@Controller('promos')
export class PromosController {
  constructor(private readonly promosService: PromosService) {}

  @Post()
  @UsePipes(new ValidationPipe({ transform: true }))
  create(@Body() createPromoDto: CreatePromoDto) {
    return this.promosService.create(createPromoDto);
  }

  @Get()
  findAll() {
    return this.promosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promosService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePromoDto: UpdatePromoDto) {
    return this.promosService.update(+id, updatePromoDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.promosService.remove(+id);
  }
}
