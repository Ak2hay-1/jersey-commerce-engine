import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';

const DUMMY_HASH = bcrypt.hashSync('__timing_dummy_password__', 4);

@Injectable()
export class PasswordService {
  hash(password: string): Promise<string> {
    const rounds = process.env.NODE_ENV === 'test' ? 4 : 12;
    return bcrypt.hash(password, rounds);
  }

  verify(hash: string, password: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async dummyVerify(password: string): Promise<void> {
    await bcrypt.compare(password, DUMMY_HASH);
  }
}
