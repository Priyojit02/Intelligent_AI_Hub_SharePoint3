from typing import Optional, Tuple
from langchain_openai import ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain_core.runnables import RunnablePassthrough
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import PromptTemplate
import logging

logger = logging.getLogger(__name__)


class QAEngineBuilder:
    """Build and configure QA retrieval chains using modern LangChain LCEL"""
    
    def __init__(self, openai_api_key: str, openai_api_base: str, 
                 model_name: str, temperature: float, retriever_k: int):
        self.openai_api_key = openai_api_key
        self.openai_api_base = openai_api_base
        self.model_name = model_name
        self.temperature = temperature
        self.retriever_k = retriever_k
    
    def build_qa_chain(self, vectorstore: FAISS):
        """Build QA chain from vector store using LCEL"""
        try:
            # Try modern LCEL approach first
            return self._build_lcel_chain(vectorstore)
        except ImportError:
            # Fallback to legacy RetrievalQA if available
            logger.warning("Falling back to legacy RetrievalQA")
            return self._build_legacy_chain(vectorstore)
    
    def _build_lcel_chain(self, vectorstore: FAISS):
        """Build QA chain using LangChain Expression Language (LCEL)"""
        # Configure retriever
        retriever = vectorstore.as_retriever(
            search_kwargs={"k": self.retriever_k}
        )
        
        # Configure LLM
        llm = ChatOpenAI(
            model=self.model_name,
            temperature=self.temperature,
            openai_api_key=self.openai_api_key,
            base_url=self.openai_api_base
        )
        
        # Define prompt template
        template = """Use the context below to answer accurately and completely.

- Always use the provided context.
- Infer missing details logically if partially available.
- If the question is generic, answer in the context domain.
- Be concise and clear.

Context: {context}

Question: {question}

Answer:"""
        
        prompt = ChatPromptTemplate.from_template(template)
        
        # Build LCEL chain
        chain = (
            {"context": retriever, "question": RunnablePassthrough()}
            | prompt
            | llm
            | StrOutputParser()
        )
        
        # Wrap in a callable that mimics RetrievalQA interface
        class LCELWrapper:
            def __init__(self, chain, retriever):
                self.chain = chain
                self.retriever = retriever
            
            def __call__(self, inputs):
                query = inputs["query"]
                # Get relevant documents for source_documents
                docs = self.retriever.get_relevant_documents(query)
                # Run the chain
                result = self.chain.invoke(query)
                return {
                    "query": query,
                    "result": result,
                    "source_documents": docs
                }
        
        return LCELWrapper(chain, retriever)
    
    def _build_legacy_chain(self, vectorstore: FAISS):
        """Fallback to legacy RetrievalQA chain"""
        try:
            from langchain.chains import RetrievalQA
        except ImportError:
            try:
                from langchain_community.chains import RetrievalQA
            except ImportError:
                raise ImportError("RetrievalQA not available in any LangChain package")
        
        # Configure retriever
        retriever = vectorstore.as_retriever(
            search_kwargs={"k": self.retriever_k}
        )
        
        # Configure LLM
        llm = ChatOpenAI(
            model=self.model_name,
            temperature=self.temperature,
            openai_api_key=self.openai_api_key,
            base_url=self.openai_api_base
        )
        
        # Define prompt template
        prompt_template = """Use the context below to answer accurately and completely.

- Always use the provided context.
- Infer missing details logically if partially available.
- If the question is generic, answer in the context domain.
- Be concise and clear.

Context: {context}

Question: {question}

Answer: """
        
        prompt = PromptTemplate(
            template=prompt_template,
            input_variables=["context", "question"]
        )
        
        # Build QA chain
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            retriever=retriever,
            chain_type="stuff",
            chain_type_kwargs={"prompt": prompt},
            return_source_documents=True,
        )
        
        return qa_chain