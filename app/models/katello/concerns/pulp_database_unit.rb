require 'set'

module Katello
  module Concerns::PulpDatabaseUnit
    extend ActiveSupport::Concern
    include Katello::Concerns::SearchByRepositoryName

    #  Class.repository_association_class

    def backend_data
      self.class.pulp_data(pulp_id) || {}
    end

    def remove_from_repository(repo_id)
      self.class.repository_association_class.where(:repository_id => repo_id, self.class.unit_id_field.to_sym => self.id).delete_all
    end

    module ClassMethods
      def content_type
        self::CONTENT_TYPE
      end

      def content_unit_class
        "::Katello::Pulp::#{self.name.demodulize}".constantize
      end

      def manage_repository_association
        true
      end

      def repository_association
        repository_association_class.name.demodulize.pluralize.underscore
      end

      def immutable_unit_types
        [Katello::Rpm, Katello::Srpm]
      end

      def with_identifiers(ids)
        ids = [ids] unless ids.is_a?(Array)
        ids.map!(&:to_s)
        id_integers = ids.map { |string| Integer(string) rescue -1 }
        where("#{self.table_name}.id in (?) or #{self.table_name}.pulp_id in (?)", id_integers, ids)
      end

      def in_repositories(repos)
        if manage_repository_association
          where(:id => repository_association_class.where(:repository_id => repos).select(unit_id_field))
        else
          where(:repository_id => repos)
        end
      end

      def pulp_data(pulp_id)
        content_unit_class.new(pulp_id)
      end

      def unit_id_field
        "#{self.name.demodulize.underscore}_id"
      end

      # Don't know if this makes any sense anymore if we do not update repository associations?
      def import_all(pulp_ids = nil)
        service_class = SmartProxy.pulp_master!.content_service(content_type)
        service_class.pulp_units_batch_all(pulp_ids).each do |units|
          units.each do |unit|
            unit = unit.with_indifferent_access
            model = Katello::Util::Support.active_record_retry do
              self.where(:pulp_id => unit['_id']).first_or_create
            end
            service = service_class.new(model.pulp_id)
            service.backend_data = unit
            service.update_model(model)
          end
        end
      end

      def import_for_repository(repository)
        pulp_ids = []
        service_class = SmartProxy.pulp_master!.content_service(content_type)
        service_class.pulp_units_batch_for_repo(repository).each do |units|
          units.each do |unit|
            unit = unit.with_indifferent_access
            unit['_id'] = unit[service_class.unit_identifier]
            model = Katello::Util::Support.active_record_retry do
              self.where(:pulp_id => unit['_id']).first_or_create
            end
            service = service_class.new(model.pulp_id)
            service.backend_data = unit
            service.update_model(model)
            pulp_ids << model.pulp_id
          end
        end
        sync_repository_associations(repository, :pulp_ids => pulp_ids) if self.manage_repository_association
      end

      def sync_repository_associations(repository, options = {})
        pulp_ids = options.fetch(:pulp_ids)
        associated_ids = with_pulp_id(pulp_ids).pluck(:id) if pulp_ids

        table_name = self.repository_association_class.table_name
        attribute_name = unit_id_field

        existing_ids = self.repository_association_class.uncached do
          self.repository_association_class.where(:repository_id => repository).pluck(attribute_name)
        end
        new_ids = associated_ids - existing_ids
        delete_ids = existing_ids - associated_ids

        queries = []

        if delete_ids.any?
          queries << "DELETE FROM #{table_name} WHERE repository_id=#{repository.id} AND #{attribute_name} IN (#{delete_ids.join(', ')})"
        end

        unless new_ids.empty?
          inserts = new_ids.map { |unit_id| "(#{unit_id.to_i}, #{repository.id.to_i}, '#{Time.now.utc.to_s(:db)}', '#{Time.now.utc.to_s(:db)}')" }
          queries << "INSERT INTO #{table_name} (#{attribute_name}, repository_id, created_at, updated_at) VALUES #{inserts.join(', ')}"
        end

        ActiveRecord::Base.transaction do
          queries.each do |query|
            ActiveRecord::Base.connection.execute(query)
          end
        end
      end

      def copy_repository_associations(source_repo, dest_repo)
        if manage_repository_association
          delete_query = "delete from #{repository_association_class.table_name} where repository_id = #{dest_repo.id} and
                         #{unit_id_field} not in (select #{unit_id_field} from #{repository_association_class.table_name} where repository_id = #{source_repo.id})"

          insert_query = "insert into #{repository_association_class.table_name} (repository_id, #{unit_id_field})
                          select #{dest_repo.id} as repository_id, #{unit_id_field} from #{repository_association_class.table_name}
                          where repository_id = #{source_repo.id} and #{unit_id_field} not in (select #{unit_id_field}
                          from #{repository_association_class.table_name} where repository_id = #{dest_repo.id})"
        else
          columns = column_names - ["id", "pulp_id", "created_at", "updated_at", "repository_id"]

          delete_query = "delete from #{self.table_name} where repository_id = #{dest_repo.id} and
                          pulp_id not in (select pulp_id from #{self.table_name} where repository_id = #{source_repo.id})"
          insert_query = "insert into #{self.table_name} (repository_id, pulp_id, #{columns.join(',')})
                    select #{dest_repo.id} as repository_id, pulp_id, #{columns.join(',')} from #{self.table_name}
                    where repository_id = #{source_repo.id} and pulp_id not in (select pulp_id
                    from #{self.table_name} where repository_id = #{dest_repo.id})"

        end
        ActiveRecord::Base.connection.execute(delete_query)
        ActiveRecord::Base.connection.execute(insert_query)
      end

      def with_pulp_id(unit_pulp_ids)
        where(:pulp_id => unit_pulp_ids)
      end
    end
  end
end
