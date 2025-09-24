// // src/schemas/session.schema.ts
// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { Document } from 'mongoose';

// @Schema({ timestamps: true })
// export class Session {
//   @Prop({ required: true })
//   userId: string;

//   @Prop({ required: true })
//   role: string;

//   @Prop({ required: true })
//   token: string;

//   @Prop()
//   deviceId: string;

//   @Prop({ default: true })
//   isActive: boolean;
// }

// export type SessionDocument = Session & Document;
// export const SessionSchema = SchemaFactory.createForClass(Session);
