module Katello
 module Resources
  module Discovery
   class Flatpak < RepoDiscovery
    attr_reader :found, :crawled, :to_follow
    def initialize(url, crawled = [], found = [], to_follow = [],
                   upstream_credentials_and_search = {
                    upstream_username: nil,
                    upstream_password: nil,
                    search: '*'
                   })
     if !url.ends_with?('/index/static?')
      url += '/index/static?'
     end
     @uri = url
     @upstream_username = upstream_credentials_and_search[:upstream_username].presence
     @upstream_password = upstream_credentials_and_search[:upstream_password].presence
     @search = upstream_credentials_and_search.fetch(:search, '*')
     @found = found
     @crawled = crawled
     @to_follow = to_follow
    end
    
    def run(_resume_point)
     flatpak_search
    end
    
    private
    
    def flatpak_search
     params = [
      ['tag', 'latest'],
      ['label:org.flatpak.ref:exists', '1']
     ]
     encoded_params = params.map { |k, v| "#{CGI.escape(k.to_s)}=#{CGI.escape(v.to_s)}" }
     url = "#{@uri}#{encoded_params.sort.join('&')}"
     100.times do
      puts "Searching: #{url}"
     end
     request_params = {
      method: :get,
      headers: { accept: :json },
      url: url
     }
     
     request_params[:user] = @upstream_username if @upstream_username
     request_params[:password] = @upstream_password if @upstream_password
     request_params[:proxy] = proxy_uri if proxy
     
      results = RestClient::Request.execute(request_params)
      JSON.parse(results)['Results'].each do |result|
       @found << result['Name']
      end
     @found.sort!
    end
   end
  end
 end
end
