import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
} from '@nestjs/common';
import { LoginUserDto } from 'src/users/dto/login-user.dto';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  //   @HttpCode(HttpStatus.OK)
  //   @Post('register')
  //   async register(
  //     @Body() registerUserDto: RegisterUserDto,
  //   ): Promise<RegisterResponse> {
  //     console.log('register user: ', registerUserDto);
  //     return await this.authService.register(registerUserDto);
  //   }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginUserDto: LoginUserDto): Promise<any> {
    console.log('login user: ', loginUserDto);
    return await this.authService.login(loginUserDto);
  }

  @Get('profile')
  getProfile(@Request() req: any) {
    return req.user;
  }
}
