source "https://rubygems.org"

# GitHub Pages가 실제로 빌드할 때 쓰는 것과 동일한 gem 세트를 그대로 사용합니다.
# 로컬에서 미리보기(jekyll serve)할 때도 이 gem으로 빌드되므로 결과가 동일합니다.
gem "github-pages", group: :jekyll_plugins

group :jekyll_plugins do
  gem "jekyll-feed"
  gem "jekyll-seo-tag"
end

# Windows / JRuby 환경 호환용 (필요 없으면 무시해도 됩니다)
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end

gem "wdm", "~> 0.1.1", :platforms => [:mingw, :x64_mingw, :mswin]
