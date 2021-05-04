import React from 'react';
import PropTypes from 'prop-types';
import { Label } from '@patternfly/react-core';

const EnvironmentLabels = (environments) => {
  switch (environments) {
    case Array:
      return environments.map(env =>
        (<React.Fragment key={env.id}><Label
          color="purple"
          href={`/lifecycle_environments/${env.id}`}
        >{`${env.name}`}
                                      </Label>
         </React.Fragment>));
    default:
      const { id, name } = environments.environments;
      return (<React.Fragment><Label
        color="purple"
        href={`/lifecycle_environments/${id}`}
      >{`${name}`}
                              </Label>
              </React.Fragment>);
  }
};

EnvironmentLabels.propTypes = {
  environments: PropTypes.oneOfType([
    PropTypes.shape({}),
    PropTypes.instanceOf(Array),
  ]),
};

EnvironmentLabels.defaultProps = {
  environments: {},
};

export default EnvironmentLabels;
