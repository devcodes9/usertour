import { ParamsError, UnknownError } from '@/common/errors';
import { Injectable, Logger } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import { createTransport } from 'nodemailer';
import compileEmailTemplate from '@/common/email/compile-email-template';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async getTeamMembers(projectId: string) {
    return await this.prisma.userOnProject.findMany({
      where: { projectId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvites(projectId: string) {
    return await this.prisma.invite.findMany({
      where: { projectId, expired: false, canceled: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelInvite(inviteId: string) {
    return await this.prisma.invite.update({
      where: { id: inviteId },
      data: { canceled: true },
    });
  }

  async changeTeamMemberRole(userId: string, projectId: string, role: Role) {
    const userOnProject = await this.prisma.userOnProject.findFirst({
      where: { userId, projectId },
    });

    // if the user is not a member of the project, throw an error
    if (!userOnProject) {
      throw new ParamsError();
    }

    return await this.prisma.$transaction(async (tx) => {
      if (role === Role.OWNER) {
        // set the owner to admin before changing the role to owner
        await tx.userOnProject.updateMany({
          where: { projectId, role: Role.OWNER },
          data: { role: Role.ADMIN },
        });
      }
      await tx.userOnProject.updateMany({
        where: { id: userOnProject.id },
        data: { role },
      });
    });
  }

  async removeTeamMember(userId: string, projectId: string) {
    const userOnProject = await this.prisma.userOnProject.findFirst({
      where: { userId, projectId },
    });

    // if the user is the only owner of the project, throw an error
    if (!userOnProject || userOnProject.role === Role.OWNER) {
      throw new ParamsError();
    }

    return await this.prisma.userOnProject.deleteMany({
      where: { userId, projectId },
    });
  }

  async inviteTeamMember(
    senderUserId: string,
    email: string,
    projectId: string,
    name: string,
    role: Role,
  ) {
    try {
      if (role === Role.OWNER) {
        throw new ParamsError();
      }
      const sender = await this.prisma.user.findUnique({
        where: { id: senderUserId },
      });
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project || !sender) {
        throw new ParamsError();
      }
      const result = await this.prisma.invite.create({
        data: {
          email,
          name,
          role,
          projectId,
          userId: sender.id,
        },
      });
      await this.sendInviteEmail(result.code, email, sender.name, project.name, name);
    } catch (error) {
      this.logger.error(error);
      throw new UnknownError();
    }
  }

  async sendEmail(data: unknown) {
    const transporter = createTransport({
      host: this.configService.get('email.host'),
      port: this.configService.get('email.port'),
      secure: true,
      auth: {
        user: this.configService.get('email.user'),
        pass: this.configService.get('email.pass'),
      },
    });
    return await transporter.sendMail(data);
  }

  async sendInviteEmail(
    code: string,
    email: string,
    fromUserName: string,
    teamName: string,
    toUserName: string,
  ) {
    const url = `${this.configService.get('app.homepageUrl')}/auth/invite/${code}`;
    const template = await compileEmailTemplate({
      fileName: 'inviteTeamMember.mjml',
      data: {
        inviterName: fromUserName,
        name: toUserName,
        teamName,
        url,
      },
    });

    return await this.sendEmail({
      from: this.configService.get('auth.email.sender'), // sender address
      to: email, // list of receivers
      subject: `${fromUserName} invited you to Usertour`, // Subject line
      html: template, // html body
    });
  }
}
