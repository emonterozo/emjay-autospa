import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { APP } from '../../common/enum';

export type VersionDocument = HydratedDocument<Version>;

@Schema()
export class Version {
  @Prop({ required: true, enum: APP })
  key: APP;

  @Prop({ required: true })
  version: string;
}

export const VersionSchema = SchemaFactory.createForClass(Version);
