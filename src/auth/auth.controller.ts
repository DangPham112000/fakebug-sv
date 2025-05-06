import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { UserRegistrationDto } from 'src/common/dto/user-registration.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('register')
  async register(@Body() registerDto: UserRegistrationDto): Promise<any> {
    console.log('register user: ', registerDto);
    return await this.authService.register(registerDto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<any> {
    console.log('login user: ', loginDto);
    return await this.authService.login(loginDto);
  }

  @Get('profile')
  getProfile(@Request() req: any) {
    return req.user;
  }
}
