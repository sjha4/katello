(function () {
    'use strict';

    /**
     * @ngdoc factory
     * @name  Bastion.docker-manifest-lists.factory:DockerManifestList
     *
     * @description
     *   Provides a BastionResource for interacting with Docker Manifest Lists
     */
    function DockerManifestList(BastionResource, CurrentOrganization) {
        return BastionResource('katello/api/v2/docker_manifest_lists/:id',
            {'id': '@id', 'organization_id': CurrentOrganization},
            {
                'autocomplete': {method: 'GET', isArray: true, params: {id: 'auto_complete_search'}}
            }
        );
    }

    angular
        .module('Bastion.docker-manifest-lists')
        .factory('DockerManifestList', DockerManifestList);

    DockerManifestList.$inject = ['BastionResource', 'CurrentOrganization'];

})();
