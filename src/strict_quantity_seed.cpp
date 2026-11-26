// Experimental closed strict quantity AOT frontend.
// Reuse the pinned Forge verified parser, never rewrite guest source.
// Compiler host may allocate; emitted kernel is a freestanding constant.
#include <atto/scalar_eval.hpp>
#include <cstdint>
#include <iostream>
#include <limits>
#include <string>

int main(int argc,char**) {
  namespace scalar=atto::forge::scalar;
  if(argc!=1){std::cerr<<"E_USAGE: source on stdin; C++ kernel on stdout\n";return 2;}
  std::string source;
  source.reserve(scalar::max_source_bytes);
  for(char ch;std::cin.get(ch);){
    if(source.size()>=scalar::max_source_bytes){std::cerr<<"E_SOURCE_LIMIT\n";return 2;}
    if(ch=='\0'){std::cerr<<"E_SOURCE_NUL\n";return 2;}
    source.push_back(ch);
  }
  if(std::cin.bad()||!std::cin.eof()){std::cerr<<"E_SOURCE_READ\n";return 2;}
  const auto parsed=scalar::parse_verified_strict_i64(source);
  if(!parsed.ok()){
    std::cerr<<scalar::parse_error_name(parsed.error)<<" byte="<<parsed.error_offset<<"\n";return 2;
  }
  if(!scalar::validate_ast(parsed)||!parsed.trace_steps.empty()){
    std::cerr<<"E_RT_PROFILE: invalid or effectful AST\n";return 2;
  }
  // The strict proof must succeed first. This independent checked fold
  // is a second fail-closed barrier, not a fallback for failed admission.
  const auto value=scalar::evaluate(parsed);
  if(!value.ok()){std::cerr<<"E_RT_PROOF_MISMATCH\n";return 2;}
  const auto literal=*value.value==std::numeric_limits<std::int64_t>::min()
    ?std::string("(-9223372036854775807LL - 1LL)"):std::to_string(*value.value)+"LL";
  std::cout<<"#include <cstdint>\nextern \"C\" std::int64_t atto_realtime_entry() noexcept { return "<<literal<<"; }\n";
  return std::cout?0:2;
}
