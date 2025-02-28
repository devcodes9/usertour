import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@usertour-ui/dropdown-menu';
import { Delete2Icon, EditIcon } from '@usertour-ui/icons';
import { useState } from 'react';
import { TeamMember, TeamMemberRole } from '@/types/theme-settings';
import { CancelInviteDialog } from './member-cancel-dialog';
import { useAppContext } from '@/contexts/app-context';
import { useMemberContext } from '@/contexts/member-context';
import { MemberChangeRoleDialog } from './member-change-role-dialog';
import { MemberRemoveDialog } from './member-remove-dialog';

type MemberListActionProps = {
  data: TeamMember;
};

export const MemberListAction = (props: MemberListActionProps) => {
  const { data } = props;
  const [open, setOpen] = useState(false);
  const { project } = useAppContext();
  const { refetch } = useMemberContext();
  const [openChangeRoleDialog, setOpenChangeRoleDialog] = useState(false);
  const [openRemoveDialog, setOpenRemoveDialog] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
            <DotsHorizontalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          {data.isInvite && (
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
              onClick={() => setOpen(true)}
            >
              <Delete2Icon className="w-6" width={16} height={16} />
              <span>Cancel invite</span>
            </DropdownMenuItem>
          )}
          {!data.isInvite && (
            <>
              <DropdownMenuItem
                className="cursor-pointer"
                disabled={data.role === TeamMemberRole.OWNER}
                onClick={() => setOpenChangeRoleDialog(true)}
              >
                <EditIcon className="w-6" width={16} height={16} />
                Change role
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                disabled={data.role === TeamMemberRole.OWNER}
                onClick={() => setOpenRemoveDialog(true)}
              >
                <Delete2Icon className="w-6" width={16} height={16} />
                Remove member
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <CancelInviteDialog
        projectId={project?.id as string}
        data={data}
        isOpen={open}
        onClose={() => {
          setOpen(false);
          refetch();
        }}
      />
      <MemberChangeRoleDialog
        projectId={project?.id as string}
        isOpen={openChangeRoleDialog}
        data={data}
        onClose={() => {
          setOpenChangeRoleDialog(false);
          refetch();
        }}
      />
      <MemberRemoveDialog
        projectId={project?.id as string}
        isOpen={openRemoveDialog}
        data={data}
        onClose={() => {
          setOpenRemoveDialog(false);
          refetch();
        }}
      />
    </>
  );
};

MemberListAction.displayName = 'MemberListAction';
