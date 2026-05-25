import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ClaimWorkspaceStateService } from '../../services/claim-workspace-state.service';

@Component({
  selector: 'app-claim-workspace-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './claim-workspace-header.component.html',
  styleUrls: ['./claim-workspace-header.component.css']
})
export class ClaimWorkspaceHeaderComponent {
  header$ = this.state.header$;
  slice$ = this.state.slice$('header');

  constructor(readonly state: ClaimWorkspaceStateService) {}
}
