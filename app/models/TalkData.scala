package models

import play.api.libs.iteratee.Iteratee
import play.api.libs.iteratee.Concurrent.Channel

class TalkData(orig:String) {
  
  val id:String = common.Util.uniqueRandomKey(5);
  val origUser:String = orig;
  var termUser:String = null;
  var origSignalOut: Channel[String] = null;
  var termSignalOut: Channel[String] = null;
  var origSignalIn: Iteratee[String,Unit] = null;
  var termSignalIn: Iteratee[String,Unit] = null;

}