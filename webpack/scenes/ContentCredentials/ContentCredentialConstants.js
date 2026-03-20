export const GET_CONTENT_CREDENTIALS_KEY = 'GET_CONTENT_CREDENTIALS';
export const CONTENT_CREDENTIAL_CERT_TYPE = 'cert';
export const CONTENT_CREDENTIAL_GPG_TYPE = 'gpg_key';

const CONTENT_CREDENTIAL_KEY = 'CONTENT_CREDENTIAL';
export const contentCredentialDetailsKey = id => `${CONTENT_CREDENTIAL_KEY}_${id}`;
export const UPDATE_CONTENT_CREDENTIAL = 'UPDATE_CONTENT_CREDENTIAL';
export const UPDATE_CONTENT_CREDENTIAL_SUCCESS = 'UPDATE_CONTENT_CREDENTIAL_SUCCESS';
export const UPDATE_CONTENT_CREDENTIAL_FAILURE = 'UPDATE_CONTENT_CREDENTIAL_FAILURE';
export const DELETE_CONTENT_CREDENTIAL_KEY = 'DELETE_CONTENT_CREDENTIAL';

export const REPO_TYPE_MAP = {
  gpg_key_repos: 'GPG Key',
  ssl_ca_root_repos: 'SSL CA Cert',
  ssl_client_root_repos: 'SSL Client Cert',
  ssl_key_root_repos: 'SSL Client Key',
};

export const PRODUCT_TYPE_MAP = {
  gpg_key_products: 'GPG Key',
  ssl_ca_products: 'SSL CA Cert',
  ssl_client_products: 'SSL Client Cert',
  ssl_key_products: 'SSL Client Key',
};

export const ACS_TYPE_MAP = {
  ssl_ca_alternate_content_sources: 'SSL CA Cert',
  ssl_client_alternate_content_sources: 'SSL Client Cert',
  ssl_key_alternate_content_sources: 'SSL Client Key',
};
