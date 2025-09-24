import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/schemas/user.schema';
import {
  PartnerProfile,
  PartnerProfileSchema,
} from 'src/schemas/partner-profile.schema';
import { PartnerKYC, PartnerKYCSchema } from 'src/schemas/partner-kyc.schema';
import { Client, ClientSchema } from 'src/schemas/client.schema';
import { JwtModule } from '@nestjs/jwt';
import { jwtConfig } from 'src/config/jwt.config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  Installation,
  InstallationSchema,
} from 'src/schemas/create-installation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PartnerProfile.name, schema: PartnerProfileSchema },
      { name: PartnerKYC.name, schema: PartnerKYCSchema },
      { name: Client.name, schema: ClientSchema },
      { name: Installation.name, schema: InstallationSchema },
    ]),
    JwtModule.register({
      secret: jwtConfig.secret,
      signOptions: {
        expiresIn: jwtConfig.refreshTokenExpiresIn,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
