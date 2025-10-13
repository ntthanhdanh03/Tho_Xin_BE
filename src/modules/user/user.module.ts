import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User, UserSchema } from 'src/schemas/user.schema';
import {
  PartnerProfile,
  PartnerProfileSchema,
} from 'src/schemas/partner-profile.schema';
import { PartnerKYC, PartnerKYCSchema } from 'src/schemas/partner-kyc.schema';
import { Client, ClientSchema } from 'src/schemas/client.schema';
import {
  PartnerLocation,
  PartnerLocationSchema,
} from 'src/schemas/partner-location.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PartnerProfile.name, schema: PartnerProfileSchema },
      { name: PartnerKYC.name, schema: PartnerKYCSchema },
      { name: Client.name, schema: ClientSchema },
      { name: PartnerLocation.name, schema: PartnerLocationSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
