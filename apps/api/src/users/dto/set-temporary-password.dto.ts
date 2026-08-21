import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PASSWORD_STRENGTH_MESSAGE, PASSWORD_STRENGTH_REGEX } from '../../auth/dto/change-password.dto';

export class SetTemporaryPasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(128)
  @Matches(PASSWORD_STRENGTH_REGEX, { message: PASSWORD_STRENGTH_MESSAGE })
  password!: string;
}
