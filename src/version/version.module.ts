import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VersionService } from './version.service';
import { VersionController } from './version.controller';
import { Version, VersionSchema } from './schemas/version.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Version.name, schema: VersionSchema }]),
  ],
  controllers: [VersionController],
  providers: [VersionService],
})
export class VersionModule {}
