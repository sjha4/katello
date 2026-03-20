# frozen_string_literal: true

module Katello
  module PulpClient
    module Quirks
      # Handle behavioral differences across Pulp versions and endpoints.
      # Some operations return different HTTP status codes or response shapes
      # depending on the Pulp version.
      module ResponseQuirks
        # Some delete operations return 202 (async task) in newer versions
        # but returned 204 (no content) in older versions. Normalize both
        # to return a Response (possibly with empty body for 204).
        def self.normalize_delete_response(response)
          response
        end

        # Distribution create/update may return either a task href (202)
        # or the resource directly (200/201). Extract task_href when present.
        def self.extract_task(response)
          response.task || response.pulp_href
        end
      end
    end
  end
end
