package models

import play.api._

object TalkCache {
  
  val cache = collection.mutable.Map[String, TalkData]()
  
  def getTalk(userId:String):Option[TalkData] = {
    Logger.info("get talk called")
    cache foreach {
      case (key, value) => {
        if(value.origUser.equalsIgnoreCase(userId)){
          Logger.info("get talk found")
           return Option(value);
        } 
        if(value.termUser != null && value.termUser.equalsIgnoreCase(userId)){
          Logger.info("get talk found")
           return Option(value);
        }  
      }
    }
    Logger.info("get talk not found")
    return None;
  }
  
  def addTalk(data:TalkData){
    cache.put(data.id, data);
  }
  
  def deleteTalk(userId:String){
    var id:String = null;
    cache foreach {
      case (key, value) => {
        if(value.origUser.equalsIgnoreCase(userId)){
           id = value.id;
        } 
        if(value.termUser != null && value.termUser.equalsIgnoreCase(userId)){
           id = value.id;
        }  
      }
    }
    if(id!=null){
      cache.remove(id)
    }
    
  }

}