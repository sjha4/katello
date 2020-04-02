(function () {
    'use strict';

    /**
     * @ngdoc factory
     * @name  Bastion.package-groups.factory:PackageGroup
     *
     * @description
     *   Provides a BastionResource for interacting with Package Groups
     */
    function PackageGroup(BastionResource, CurrentOrganization) {
        return BastionResource('katello/api/v2/package_groups/:id',
            {'id': '@id', 'organization_id': CurrentOrganization},
            {
              autocomplete: {method: 'GET', isArray: true, params: {id: 'auto_complete_search'}}
            }
        );
    }

    angular
        .module('Bastion.package-groups')
        .factory('PackageGroup', PackageGroup);

    PackageGroup.$inject = ['BastionResource', 'CurrentOrganization'];

})();
