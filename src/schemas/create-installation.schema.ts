import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as mongoose from 'mongoose';

export type InstallationDocument = Installation & Document;

@Schema()
export class DeviceToken {
  @Prop({ required: true })
  token: string;

  @Prop()
  osVersion?: string;

  @Prop()
  fcmToken?: string;
}

const DeviceTokenSchema = SchemaFactory.createForClass(DeviceToken);

@Schema({ timestamps: true })
export class Installation {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  idUsers: Types.ObjectId;

  @Prop({ type: [DeviceTokenSchema], default: [] })
  deviceToken: DeviceToken[];
}

export const InstallationSchema = SchemaFactory.createForClass(Installation);
