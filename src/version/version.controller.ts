import { Controller, Get } from '@nestjs/common';
import { VersionService } from './version.service';

@Controller('versions')
export class VersionController {
  constructor(private readonly versionService: VersionService) {}

  @Get()
  findAll() {
    return this.versionService.findAll();
  }
}
