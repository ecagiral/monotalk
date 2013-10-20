package common

import scala.util.Random

object Util {
  
  val chars = ('0' to '9');
  
  def uniqueRandomKey(length: Int) : String =
  {
     val newKey = (1 to length).map(
       x =>
       {
         val index = Random.nextInt(chars.length)
         chars(index)
       }
      ).mkString("")
      newKey
  }

}