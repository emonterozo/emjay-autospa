import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Version } from './schemas/version.schema';
import { Model } from 'mongoose';
import { SuccessResponse } from 'src/common/dto/success-response.dto';

@Injectable()
export class VersionService {
  constructor(
    @InjectModel(Version.name) private readonly versionModel: Model<Version>,
  ) {}
  async findAll() {
    const versions = await this.versionModel.find();
    return new SuccessResponse({ versions });
  }
}
