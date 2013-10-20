package controllers

import play.api._
import play.api.mvc._
import java.util.UUID
import models.TalkData
import models.TalkCache
import play.api.libs.iteratee.Enumerator
import play.api.libs.iteratee.Iteratee
import play.api.libs.iteratee.Concurrent
import play.api.libs.iteratee.Concurrent.Channel

object Application extends Controller {
  
  def index = Action { implicit request =>
    var sessionId = request.session.get("id");
    var newUser = false;
    var hasTalk = false;
    var talkId = "";
    sessionId match {
      case None =>
        newUser = true;
        sessionId = Some(UUID.randomUUID().toString());
      case Some(data) =>
    }
    Logger.info("session "+request.host);
    val talkData = TalkCache.getTalk(sessionId.get);
    var isOrig : Option[Boolean]= None;
    if(talkData != None){     
      hasTalk = true;
      talkId = talkData.get.id;
      isOrig = Option(sessionId.get == talkData.get.origUser);
    }

    if(newUser){
      Ok(views.html.index(isOrig,sessionId.get,talkData,request)).withSession("id" -> sessionId.get);
    }else{
      Ok(views.html.index(isOrig,sessionId.get,talkData,request));
    }
    
    
  }
  
  def createTalk = Action { implicit request =>

    var sessionId = request.session.get("id");
    var newUser:Boolean = false;
    sessionId match {
      case None =>
        sessionId = Some(UUID.randomUUID().toString());
        newUser=true;
      case Some(data) =>
        TalkCache.deleteTalk(data);
        
    }
    var data:TalkData = new TalkData(sessionId.get);
    TalkCache.addTalk(data);
    var success = "konusma yaratildi"
    Redirect(routes.Application.index()).flashing("sucess" -> success)
  
  }
  
    def list = Action {request =>
        Ok(views.html.list(TalkCache.getList()));
    }
  
  def getTalk(talkId:String) = Action { implicit request =>
    Logger.info("get talk "+talkId)
    var sessionId = request.session.get("id");
    var newUser:Boolean = false;
    sessionId match {
      case None =>
        sessionId = Some(UUID.randomUUID().toString());
        newUser=true;
      case Some(data) =>
        
    }
    var error = "";
    val data = TalkCache.cache.get(talkId)
    //TODO how to null check in scala?
    if(data == None){
       error = "konusma bulunamadi"
    }else{
       if(data.get.origUser.equalsIgnoreCase(sessionId.get)){
           error = "bu konusmayi siz baslattiniz"
       }
       if(data.get.termUser != null && !data.get.termUser.equals(sessionId.get)){
           error = "bu kisi bir baskasi ile gorusuyor"
       }
    }


    if(error.equalsIgnoreCase("")){
        TalkCache.deleteTalk(sessionId.get);
        data.get.termUser = sessionId.get;
        TalkCache.addTalk(data.get);
        Logger.info("talk "+talkId+" found and added for "+sessionId.get)
    }
    Redirect(routes.Application.index()).flashing("error" -> error)
  
  }
  
  def channel = WebSocket.using[String] {
    request =>
      var connected = false;
      var sessionId = request.session.get("id");
      sessionId match {
        case None =>
          sessionId = Some(UUID.randomUUID().toString());
          Logger.info("web socket session yok")
        case Some(data) =>
          Logger.info("web socket session var "+data)
      }
      var data = TalkCache.getTalk(sessionId.get);
      if(data.isEmpty){
          Logger.info("web socket icin data bulunamadi");
          (null, null)
      }else{
          val isOrig = data.get.origUser.equalsIgnoreCase(sessionId.get);
          val in = Iteratee.foreach[String]{
                  msg =>
                    Logger.info("sending message "+msg+" to talk "+data.get.id +" from "+sessionId.get)
                    var _data = TalkCache.cache.get(data.get.id)
                    val isOrig = _data.get.origUser.equalsIgnoreCase(sessionId.get);
                    var target:Channel[String]=null;
                    if(isOrig){
                      target = _data.get.termSignalOut;
                    }else{
                      target = _data.get.origSignalOut;
                    }
                    target.push(msg)
                    Logger.info("sent message "+msg+" to "+target+" from "+sessionId.get)
          }
          var (out, channel) = Concurrent.broadcast[String]
          if(!data.isEmpty){
            if(isOrig){
              data.get.origSignalOut = channel;
              if(data.get.termSignalOut!=null){
                data.get.termSignalOut.push("{\"type\":\"join\",\"user\":\""+sessionId.get+"\"}")
              }
            }else{
              data.get.termSignalOut = channel;
              if(data.get.origSignalOut!=null){
                data.get.origSignalOut.push("{\"type\":\"join\",\"user\":\""+sessionId.get+"\"}")
              }
            }
          }
          (in, out)
      }
  }
   
}