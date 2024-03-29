import React, { useCallback } from 'react';
import {
  useShowContext,
  useTranslate,
  AutocompleteInput,
  CreateBase,
  useDataProvider,
  useNotify, TextInput
} from 'react-admin';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  makeStyles,
  useMediaQuery,
} from '@material-ui/core';
import { useCheckAuthenticated } from '@semapps/auth-provider';
import { useOutbox, ACTIVITY_TYPES } from '@semapps/activitypub-components';
import { ReferenceInput } from '@semapps/input-components';
import { Form } from 'react-final-form';

const useStyles = makeStyles((theme) => ({
  dialogPaper: {
    margin: 16,
  },
  title: {
    padding: 24,
    [theme.breakpoints.down('sm')]: {
      padding: 16,
      paddingBottom: 4,
    },
  },
  actions: {
    padding: 15,
    height: 38,
  },
  list: {
    width: '100%',
    maxWidth: '100%',
    backgroundColor: theme.palette.background.paper,
    padding: 0,
  },
  listForm: {
    paddingTop: 0,
    paddingBottom: 0,
    paddingRight: 0,
    marginRight: 24,
    [theme.breakpoints.down('sm')]: {
      padding: '0px 16px',
      margin: 0,
    },
  },
}));

const EmitDialog = ({ close, badgeUri }) => {
  const classes = useStyles();
  const { identity } = useCheckAuthenticated();
  const { record } = useShowContext();
  const outbox = useOutbox();
  const notify = useNotify();
  const dataProvider = useDataProvider();
  const translate = useTranslate();
  const xs = useMediaQuery((theme) => theme.breakpoints.down('xs'), { noSsr: true });

  const emit = useCallback(async ({ recipientUri, evidence }) => {
    const { data: recipient } = await dataProvider.getOne('Profile', { id: recipientUri });

    const { data: assertion } = await dataProvider.create('Assertion', { data: {
      type: 'Assertion',
      recipient: {
        type: 'schema:url',
        identity: recipient.describes,
      },
      badge: badgeUri,
      issuedOn: (new Date()).toISOString(),
      evidence: evidence && {
        narrative: evidence
      },
      verification: {
        type: 'HostedBadge'
      }
    }});

    await outbox.post({
      type: ACTIVITY_TYPES.ANNOUNCE,
      actor: outbox.owner,
      object: assertion.id,
      target: recipient.describes,
      to: recipient.describes,
    });

    notify(`Badge accordé et partagé à ${recipient['vcard:given-name']}`, { type: 'success' });

    close();
  }, [dataProvider, badgeUri, outbox, notify, close])

  if (!identity) return null;

  return (
    <CreateBase resource="Assertion" basePath="/Assertion">
      <Form
        onSubmit={emit}
        render={({ handleSubmit, submitting }) => (
          <form>
            <Dialog fullWidth={!xs} open={true} onClose={close} classes={{ paper: classes.dialogPaper }}>
              <DialogTitle className={classes.title}>Emettre le Badge</DialogTitle>
              <DialogContent className={classes.listForm}>
                <ReferenceInput label="Destinataire" reference="Profile" source="recipientUri">
                  <AutocompleteInput optionText="vcard:given-name" fullWidth />
                </ReferenceInput>
                <TextInput label="Evidence" source="evidence" fullWidth multiline minRows={3} />
              </DialogContent>
              <DialogActions className={classes.actions}>
                <Button variant="text" size="medium" onClick={close}>
                  {translate('ra.action.close')}
                </Button>
                <Button variant="contained" color="primary" size="medium" disabled={submitting} onClick={handleSubmit}>
                  Émettre
                </Button>
              </DialogActions>
            </Dialog>
          </form>
        )}
      />
    </CreateBase>
  );
};

export default EmitDialog;
